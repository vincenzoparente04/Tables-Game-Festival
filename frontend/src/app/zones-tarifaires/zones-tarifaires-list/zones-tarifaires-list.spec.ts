import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonesTarifairesList } from './zones-tarifaires-list';

describe('ZonesTarifairesList', () => {
  let component: ZonesTarifairesList;
  let fixture: ComponentFixture<ZonesTarifairesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonesTarifairesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZonesTarifairesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
