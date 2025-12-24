import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonePlanCard } from './zone-plan-card';

describe('ZonePlanCard', () => {
  let component: ZonePlanCard;
  let fixture: ComponentFixture<ZonePlanCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonePlanCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZonePlanCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
