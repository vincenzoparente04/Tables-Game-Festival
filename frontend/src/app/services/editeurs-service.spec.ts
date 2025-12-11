import { TestBed } from '@angular/core/testing';

import { EditeursService } from './editeurs-service';

describe('EditeursService', () => {
  let service: EditeursService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditeursService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
